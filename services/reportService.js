const reportModel =
  require('../models/reportModel');

const clubModel =
  require('../models/clubModel');

exports.createClubReport = async ({
  clubId,
  userId,
  reasonCode,
  customReason
}) => {

  const REPORT_REASON = [
    'FALSE_INFO',
    'ADVERTISEMENT',
    'HATE_SPEECH',
    'ETC'
  ];

  // 신고 사유 필수
  if (!reasonCode) {

    const error =
      new Error(
        '신고 사유는 필수 입력 사항입니다.'
      );

    error.status = 400;
    error.code = 'REPORT_400';

    throw error;
  }

  // 신고 사유 enum validation
  if (
    !REPORT_REASON.includes(reasonCode)
  ) {

    const error =
      new Error(
        '올바르지 않은 신고 사유입니다.'
      );

    error.status = 400;
    error.code = 'REPORT_400';

    throw error;
  }

  // ETC 선택 시 상세 내용 필수
  if (
    reasonCode === 'ETC' &&
    (
      !customReason ||
      customReason.trim() === ''
    )
  ) {

    const error =
      new Error(
        '기타 신고 사유 상세 내용은 필수 입력입니다.'
      );

    error.status = 400;
    error.code = 'REPORT_400';

    throw error;
  }

  // 동아리 존재 여부 확인
  const club =
    await clubModel.findClubById(clubId);

  if (!club) {

    const error =
      new Error(
        '신고하려는 동아리 정보를 찾을 수 없습니다.'
      );

    error.status = 404;
    error.code = 'CLUB_404';

    throw error;
  }

  try {

    // 신고 저장
    const report =
      await reportModel.createClubReport({
        clubId,
        userId,
        reasonCode,
        customReason
      });

    

    return report;

  } catch (error) {

    // UNIQUE(user_id, club_id)
    if (err.code === 'ER_DUP_ENTRY') {

      const error =
        new Error(
          '이미 신고 처리가 완료된 동아리입니다. (한 동아리당 1회만 가능)'
        );

      error.status = 409;
      error.code = 'REPORT_409';

      throw error;
    }

    throw error;
  }
};